var mysql = require('mysql');
const util = require('util');
const validate = require("validate.js");
const validate_rules = {
  name: {
    presence: {
      allowEmpty: false
    },
  },
  telephone: {
    presence: {
      allowEmpty: false
    }
  },
  address: {
    presence: {
      allowEmpty: false
    }
  }
};
var con = mysql.createPool({
  host: "localhost",
  socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock',
  user: "root",
  password: "root",
  database: "sampran_upstream_cloud",
  charset: 'utf8'
});

var con_commerce = mysql.createPool({
  host: "localhost",
  socketPath: '/Applications/MAMP/tmp/mysql/mysql.sock',
  user: "root",
  password: "root",
  database: "sampran_ecommerce_cloud",
  charset: 'utf8'
});

const query = util.promisify(con.query).bind(con);
const query_commerce = util.promisify(con_commerce.query).bind(con_commerce);

let contact = {};

// Get Data Contact
contact.getAll = async (req, res) => {
  let result = await query("SELECT user.*,group.name as group_name FROM `user` INNER JOIN `user_user_type` ON user_user_type.user_id=user.id LEFT JOIN `user_user_group` ON user_user_group.user_id=user.id LEFT JOIN `group` ON group.id=user_user_group.group_id where user_user_type.user_type_id = 4 AND user.status_id = 1");
  if (result) {
    let respon = []

    for (let data of result) {
      // ที่อยู่
      const district = await query("SELECT district.name_th as district_name,amphur.name_th as amphur_name,province.name_th as province_name FROM `district` INNER JOIN `amphur` ON amphur.id=district.amphur_id INNER JOIN `province` ON province.id=amphur.province_id WHERE  district.status_id = 1 AND district.id = " + data.district_id);
      let location = ` ต. ${(district[0]!= undefined)?district[0].district_name:"" } อ. ${(district[0]!= undefined)?district[0].amphur_name:"" } จ. ${(district[0]!= undefined)?district[0].province_name:"" }`;

      // สินค้า
      const product = await query("SELECT product_master.name_th FROM `product` INNER JOIN `product_master` ON product.product_master_id=product_master.id where product.status_id = 1 AND product.user_id = " + data.id);
      console.log(data.id)
      var product_name = "กลุ่ม " + ((data.group_name == null) ? "" : (data.group_name + " ; ")) + "ผลผลิต ";
      if (product.length != 0) {
        for (let product_master of product) {
          product_name += product_master.name_th + ",";
        }
      } else {
        product_name = "-";
      }

      // มาตรฐาน
      const standart = await query("SELECT standard_certificate.name FROM `user_standard_certificate` INNER JOIN `standard_certificate` ON standard_certificate.id = user_standard_certificate.standard_certificate_id where user_standard_certificate.status_id = 1 AND user_standard_certificate.user_id = " + data.id);
      let is_search_array = ([17, 18, 19, 20, 21, 22, 23, 24, 32, 33, 34, 35, 37, 38, 39, 41, 42, 43, 68, 130, 131, 132, 133, 177, 205, 323, 330, 356, 357, 359, 360, 364, 365, 366, 367, 443].filter(user => data.id == user).length == 0);
      if ((data.company_id != 2) && is_search_array) {
        var sql = "INSERT INTO activity (image_path, name_th,name_en,detail_th,detail_en,location_th,location_en,contact,latitude,longitude,activity_category_id,remark_th) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)";
        let result = await query_commerce(sql, [(data.profile_image == null) ? "/upload/default/farmer.png" : data.profile_image, data.name, "-", product_name, "-", data.address + location, "-", (data.phone == "") ? "-" : data.phone, (data.latitude == null) ? "-" : data.latitude, (data.longitude == null) ? "-" : data.longitude, 5, (standart.length == 0) ? "-" : "ได้รับมาตรฐาน " + standart[0].name]);
        // respons
        respon.push(result);
      }

    };

    res.responseRequestSuccess(respon);

  } else {
    res.responseRequestError("ไม่สามารถแสดงข้อมูลได้");
  }

}

contact.getID = async (req, res) => {
  let id = req.params.id;
  const errors = validate({
    id
  }, {
    id: {
      numericality: true
    }
  });
  if (errors) res.responseRequestError(errors);
  let result = selectID(req.params.id)
  if (result)
    res.responseRequestSuccess(result);
  else
    res.responseRequestError("ไม่สามารถแสดงข้อมูลได้");
}

selectID = async (id) => {
  var sql = `SELECT * FROM contact where id= ${id}`;
  return await query(sql);
}

// Add data Contact 
contact.addData = async (req, res) => {
  const errors = validate(req.body, validate_rules);
  if (errors) res.responseRequestError(errors);
  var sql = "INSERT INTO contact (name, address,telephone,created_at,updated_at) VALUES (?,?,?,?,?)";
  let result = await query(sql, [req.body.name, req.body.address, req.body.telephone, new Date(), new Date()]);
  if (result)
    res.responseRequestSuccess(await selectID(result.insertId));
  else
    res.responseRequestError("ไม่สามารถแสดงข้อมูลได้");
}

// Update data Contact
contact.updateData = async (req, res) => {
  let id = req.params.id;
  const errors = validate(req.body, validate_rules);
  const errorsId = validate({
    id
  }, {
    id: {
      numericality: true
    }
  });
  if (errors || errorsId) res.responseRequestError(errors || errorsId);
  var sql = `UPDATE contact SET name = ?,address = ?, telephone = ? , updated_at = ? WHERE id = ?`;
  let result = await query(sql, [req.body.name, req.body.address, req.body.telephone, new Date(), req.params.id]);
  if (result)
    res.responseRequestSuccess(await selectID(req.params.id));
  else
    res.responseRequestError("ไม่สามารถแสดงข้อมูลได้");
}

// Delete data Contact
contact.deleteData = async (req, res) => {
  var sql = `DELETE FROM contact WHERE id = ${req.params.id}`;
  let result = await query(sql);
  if (result)
    res.responseRequestSuccess("Delete Success");
  else
    res.responseRequestError("ไม่สามารถแสดงข้อมูลได้");
}

module.exports = contact;